//
//  AppDelegate.m
//  HappyFunTimes runner
//

#import "AppDelegate.h"

@implementation AppDelegate

- (void)applicationDidFinishLaunching:(NSNotification *)aNotification {
    NSLog(@"launched");
    [self startHFT];
}

- (BOOL) applicationShouldOpenUntitledFile:(NSApplication *)sender
{
    [_window makeKeyAndOrderFront:self];
    return NO;
}

- (IBAction)startTask:(id)sender {
    [self startHFT];
}

- (IBAction)stopTask:(id)sender {
    [self stopHFT];
}

- (void)windowWillClose:(NSWindow *)sender {
  NSLog(@"willclose");
  [self stopHFT];
  [NSApp terminate:self];
}

- (BOOL)windowShouldClose:(NSWindow *)sender {
  NSLog(@"shouldclose");
  [self stopHFT];
  return YES;
}

- (void)startHFT {
    self.outputText.string = @"";
    
    NSString *startArg         = @"start";
    
    NSMutableArray *arguments = [[NSMutableArray alloc] init];
    [arguments addObject:startArg];
    
    [self.buildButton setEnabled:NO];
    [self.spinner startAnimation:self];
    
    [self runScript:arguments];
}

- (void)stopHFT {
    if ([self.buildTask isRunning]) {
        [self.buildTask terminate];
    }  
}

- (void)runScript:(NSArray*)arguments {

  dispatch_queue_t taskQueue = dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_BACKGROUND, 0);
  dispatch_async(taskQueue, ^{

    self.isRunning = YES;

    @try {

      NSString *path  = [NSString stringWithFormat:@"%@", [[NSBundle mainBundle] pathForResource:@"hft" ofType:@"command"]];

      self.buildTask            = [[NSTask alloc] init];
      self.buildTask.launchPath = path;
      self.buildTask.arguments  = arguments;

      // Output Handling
      self.outputPipe               = [[NSPipe alloc] init];
      self.buildTask.standardOutput = self.outputPipe;
      self.buildTask.standardError  = self.outputPipe;

      [[self.outputPipe fileHandleForReading] waitForDataInBackgroundAndNotify];

      [[NSNotificationCenter defaultCenter] addObserverForName:NSFileHandleDataAvailableNotification object:[self.outputPipe fileHandleForReading] queue:nil usingBlock:^(NSNotification *notification){

        NSData *output = [[self.outputPipe fileHandleForReading] availableData];
        NSString *outStr = [[NSString alloc] initWithData:output encoding:NSUTF8StringEncoding];

        dispatch_sync(dispatch_get_main_queue(), ^{
          self.outputText.string = [self.outputText.string stringByAppendingString:[NSString stringWithFormat:@"\n%@", outStr]];
          // Scroll to end of outputText field
          NSRange range;
          range = NSMakeRange([self.outputText.string length], 0);
          [self.outputText scrollRangeToVisible:range];
        });

        [[self.outputPipe fileHandleForReading] waitForDataInBackgroundAndNotify];
      }];

      [self.buildTask launch];

      [self.buildTask waitUntilExit];
    }
    @catch (NSException *exception) {
      NSLog(@"Problem Running Task: %@", [exception description]);
    }
    @finally {
      [self.buildButton setEnabled:YES];
      [self.spinner stopAnimation:self];
      self.isRunning = NO;
    }
  });
}

@end
